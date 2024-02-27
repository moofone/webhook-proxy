import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const listenPort = process.env.LISTEN_PORT || "3000";
const listenIp = process.env.LISTEN_IP || "127.0.0.1";

const forwardingUrls = process.env.FORWARDING_URLS?.split(",") || [];
console.log(`forwardingUrls:${forwardingUrls}`);

app.use(express.json({ type: "*/*" }));

app.use((req, res, next) => {
  console.log("", req.body);
  next();
});

app.all("*", async (req, res) => {
  try {
    const promises = forwardingUrls.map((url) => {
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => headers.append(key, val));
        } else {
          headers.append(key, value || "");
        }
      });

      const contentType = req.headers["content-type"];
      if (contentType) {
        headers.set("Content-Type", contentType);
      } else {
        headers.set("Content-Type", "application/json");
      }

      return fetch(url, {
        method: req.method,
        body: JSON.stringify(req.body),
        headers: headers,
      });
    });

    await Promise.all(promises);
    res.status(200).send("Request forwarded successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error forwarding request");
  }
});

const port = parseInt(listenPort, 10);
app.listen(port, listenIp, () => {
  console.log(`Webhook forwarder listening at http://${listenIp}:${port}`);
});
