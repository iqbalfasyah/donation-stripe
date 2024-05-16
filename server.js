const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const stripe = Stripe('sk_test_51O9f3CB5dHGF8zjRRXF4AKy05Rb0R5Zgr9m0NG1mDgZwq52QRbz5j7NZ93cMpWV4fB2lVGEYxekuCqvdVDjDylxS00A9TRbJZ5'); 

app.use(cors());
app.use(bodyParser.json());

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

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
