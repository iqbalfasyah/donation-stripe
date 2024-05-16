const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const stripe = Stripe('sk_test_51O9f3CB5dHGF8zjRRXF4AKy05Rb0R5Zgr9m0NG1mDgZwq52QRbz5j7NZ93cMpWV4fB2lVGEYxekuCqvdVDjDylxS00A9TRbJZ5');

app.use(cors());
app.use(bodyParser.json());

const PLAN_IDS = {
    day: 'plan_day_001',
    week: 'plan_week_001',
    month: 'plan_month_001',
    year : 'plan_year_001'
};

const PLAN_INTERVALS = {
    day: { interval: 'day', interval_count: 1 },
    week: { interval: 'day', interval_count: 7 },
    month: { interval: 'month', interval_count: 1 },
    year: { interval: 'year', interval_count: 1 }
};

// Ensure plan exists, create if it doesn't
const ensurePlanExists = async (donation_type, amount) => {
    const planId = PLAN_IDS[donation_type];
    const intervalDetails = PLAN_INTERVALS[donation_type];

    try {
        await stripe.plans.retrieve(planId);
    } catch (error) {
        if (error.code === 'resource_missing') {
            
            const currAmount = amount * 100;
            await stripe.plans.create({
                id: `${planId}_${currAmount}`,
                amount: currAmount,
                currency: 'aud',
                interval: intervalDetails.interval,
                interval_count: intervalDetails.interval_count,
                product: {
                    name: `Hope Donation (${donation_type} - ${currAmount})`
                }
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
            currency: 'aud',
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
        await ensurePlanExists(donation_type, amount);

        const customer = await stripe.customers.create({
            payment_method: payment_method,
            email: email,
            name: `${first_name} ${last_name}`,
            phone: phone,
            invoice_settings: {
                default_payment_method: payment_method,
            },
        });

        const planId = PLAN_IDS[donation_type];
        const currAmount = amount * 100;

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                plan: `${planId}_${currAmount}`,
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
