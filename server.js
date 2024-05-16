const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const stripe = Stripe('sk_test_51O9f3CB5dHGF8zjRRXF4AKy05Rb0R5Zgr9m0NG1mDgZwq52QRbz5j7NZ93cMpWV4fB2lVGEYxekuCqvdVDjDylxS00A9TRbJZ5');

app.use(cors());
app.use(bodyParser.json());

const PRODUCT_ID = 'hope_donate_001';
const PRODUCT_NAME = 'Hope Donation';

// Function to ensure product exists
const ensureProductExists = async () => {
    try {
        await stripe.products.retrieve(PRODUCT_ID);
    } catch (error) {
        if (error.code === 'resource_missing') {
            // Product does not exist, create it
            await stripe.products.create({
                id: PRODUCT_ID,
                name: PRODUCT_NAME,
            });
        } else {
            throw error;
        }
    }
};

app.post('/create-payment-intent', async (req, res) => {
    const { amount, first_name, last_name, email, phone, donation_type } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: 'usd',
            payment_method_types: ['card'],
            metadata: {
                first_name,
                last_name,
                email,
                phone,
                donation_type,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

app.post('/create-subscription', async (req, res) => {
    const { payment_method, first_name, last_name, email, phone, donation_type, amount } = req.body;

    try {
        await ensureProductExists();

        const customer = await stripe.customers.create({
            payment_method: payment_method,
            email: email,
            name: `${first_name} ${last_name}`,
            phone: phone,
            invoice_settings: {
                default_payment_method: payment_method,
            },
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                price_data: {
                    currency: 'usd',
                    product: PRODUCT_ID,
                    recurring: {
                        interval: donation_type, // daily, monthly, quarterly, yearly
                    },
                    unit_amount: amount * 100,
                },
            }],
            expand: ['latest_invoice.payment_intent'],
        });

        res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
