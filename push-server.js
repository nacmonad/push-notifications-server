// push-server.js
const webpush =require('web-push');
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config()


// Replace with your VAPID keys
// const vapidKeys = webpush.generateVAPIDKeys();
// const { publicKey, privateKey } = vapidKeys;
// console.log('VAPID Keys:', vapidKeys);

const redis = new Redis(); // Redis client

webpush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL}`, // Replace with your email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);


const PORT = 8081;
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
}))

app.use(express.json());


app.post('/api/push', async (req, res) => {
  const headers = req.headers;
  const partnerId = headers['x-odoo-partner-id'];
  
  const { payload:raw, } = req.body;

  const { partner_id: targetPartnerId, type, payload } = raw;

  try {
    console.log("[push]", {
        targetPartnerId,
        type,
        payload
    })
    const recipientSub = await redis.hget('subscriptions', targetPartnerId);
    console.log("[push]recipientSub",  recipientSub)
    webpush.sendNotification(JSON.parse(recipientSub), JSON.stringify(payload));
    res.status(200).json({ message: 'Pushed notification', recipientSub });
  } catch(e) {
    res.status(500).json({ error:e })
  }
});

app.post('/api/subscribe', async (req, res) => {
  const headers = req.headers;
  const partnerId = headers['x-odoo-partner-id'];
  const subscription = { partnerId, ...req.body };
  console.log("/api/subscribe", {
    partnerId,
    subscription
  })
  await redis.hset('subscriptions', partnerId, JSON.stringify(subscription));
  res.status(200).json({ message: 'Subscription saved successfully', subscription });
});

app.listen(PORT, ()=>{
  console.log(`Push-Notifications handler listening on ${PORT}`);
})
