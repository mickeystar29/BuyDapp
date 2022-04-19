require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);
const sdk = require('api')('@coinbase-exchange/v1.0#10ldz4jl0h5qqgo');

class Controller {

    async checkout(req) {
        const amount = req.amount;
        const coin = req.coin;
        const wallet = req.wallet;
        var payable = 0.0;
            if (coin === 'eth') {
                await sdk['ExchangeRESTAPI_GetCoinbasePriceOracle']()
                .then(res => {
                    payable = amount / res['prices'['ETH']];
                })
                .catch(err => console.error(err));
            } else {
                payable = amount;
            }

        return client.rest.withdraw.withdrawToCryptoAddress(payable, coin, wallet, 'buy', true);
    }

    async payout(req) {
        try {
            const dest = req.bankId;
            const payout = await stripe.payouts.create({
                amount: 1100,
                currency: 'usd',
                description: 'payout payment',
                destination: dest,
                source_type: 'bank_account'
            });
            return payout;
        } catch (e) {
            throw e;
        }
    }

    /*** 
     * it is for Connected account for Payout
     */
    async registerAccount(req) {
        try {
            const fName = req.first_name;
            const lName = req.last_name;
            const dob = req.dob;
            const phone = req.phone;
            const email = req.email;
            const idNumber = req.idNumber;

            const individual = {
                first_name: fName,
                last_name: lName,
                dob: dob,
                phone: phone,
                email: email,
                id_number: idNumber,
                ssn_last_4: idNumber // for only US
            }

            const account = await stripe.accounts.create({
                type: 'custom',
                // country: 'US',
                email: email,
                business_type: 'individual',
                individual: individual,
                capabilities: {
                    card_payments: {requested: false},
                    transfers: {requested: true},
                },
            });

            return account.id;

        } catch (e) {
            throw e;
        }
    }

    /*** 
     * it is for Bank of Connected account
     */ 

    async completeAccountWithBank(req) {
        try {
            const accountId = req.accountId;
            const country = req.country;
            const city = req.city;
            const state = req.state; // province
            const postal_code = req.postal_code;
            const address = req.address;
            const account_number = req.bank_account_number;
            const routing_number = req.bank_routing_number;
            const account_holder_name = req.bank_account_holder_name;

            const individualAddress = {
                city: city, 
                state: state,
                country: country,
                line1: address,
                postal_code: postal_code,
            }

            await stripe.accounts.update(
                accountId,
                {individual: {address: individualAddress}}
            );

            const bank = {
                object: 'bank_account',
                country: country,
                currency: 'US', // check again,
                account_holder_name: account_holder_name,
                routing_number: routing_number,
                account_number: account_number,
            }

            const bankAccount = await stripe.accounts.createExternalAccount(
                accountId,
                {
                  external_account: bank,
                }
            );

            return bankAccount;

        } catch (e) {
            throw e;
        }
    }

    async updateAccount(req) {
        try {
            const accountId = req.accountId;
            const country = req.country;
            const city = req.city;
            const state = req.state; // province
            const postal_code = req.postal_code;
            const address = req.address;

            const individualAddress = {
                city: city, 
                state: state,
                country: country,
                line1: address,
                postal_code: postal_code,
            }
    
            const account = await stripe.accounts.update(
                accountId,
                {individual: {address: individualAddress}}
            );

            return account;
        } catch (error) {
            throw error;
        }
        
    }

    /*** 
     * it is for payment method of PaymentIntent 
     */ 

    async addBankForCustomer(req) {
        try {
            const customer = req.customerId;
            const country = req.country;
            const city = req.city;
            const state = req.state; // province
            const postal_code = req.postal_code;
            const address = req.address;
            const account_number = req.bank_account_number;
            const routing_number = req.bank_routing_number;
            const account_holder_name = req.bank_account_holder_name;

            const addressObj = {
                city: city, 
                state: state,
                country: country,
                line1: address,
                postal_code: postal_code,
            }

            await stripe.customers.update(
                customer,
                {address: addressObj}
            );

            const bank = {
                object: 'bank_account',
                country: country,
                currency: 'US', // check again,
                account_holder_name: account_holder_name,
                routing_number: routing_number,
                account_number: account_number,
            }

            const bankAccount = await stripe.customers.createSource(
                customer,
                {source: bank}
            ); 

            return bankAccount;

        } catch (e) {
            throw e;
        }
    }

    async onBoradLink(req) {
        try {
            var accountId = req.account;
            if ( accountId === null || accountId === undefined) {
                const account = await stripe.accounts.create({ type: 'custom' });
                accountId = account.id;
            }
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: 'http://localhost/refresh',
                return_url: 'http://localhost/return',
                type: 'account_onboarding',
            });
            accountLink['id'] = accountId;
            return accountLink;
        } catch (e) {
            throw e;
        }
    }

    async paymentSheet(req) {
        const amount = req.amount;
        var customerId = req.customer;
        const account = req.account;

        try {
            if (customerId === null) {
                const customer = await stripe.customers.create();
                customerId = customer.id;
            }
            const ephemeralKey = await stripe.ephemeralKeys.create(
                { customer: customerId },
                { apiVersion: '2020-08-27' }
            );
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency: 'usd',
                customer: customerId,
                // automatic_payment_methods: {
                //     enabled: true,
                // },
                payment_method_types: ['card', 'sepa_debit'],
                application_fee_amount: amount * 0.1,
                transfer_data: {
                    destination: account,
                },
            });
    
            const rest = {
                paymentIntent: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customer: customerId,
                publishableKey: process.env.STRIPE_PUB_KEY
            };
            return rest;
        } catch (e) {
            throw e;
        }
    }

    async webhook(req) {
    }
}
module.exports = new Controller()