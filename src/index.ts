const http = require("http");
const https = require("https");
const { URL } = require("url");
const dotenv = require("dotenv");

import { IncomingMessage, ServerResponse } from "http";

dotenv.config();

const listenPort = Number(process.env.LISTEN_PORT) || 3000;
const listenIp = process.env.LISTEN_IP || "127.0.0.1";
const timeoutMs = Number(process.env.TIMEOUT_MS) || 2000;

const forwardingUrls = process.env.FORWARDING_URLS?.split(",") || [];
console.log(`${new Date().toISOString()} forwardingUrls:${forwardingUrls}`);

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const buffers: Buffer[] = [];

  req.on("data", (chunk) => {
    buffers.push(chunk);
  });

  req.on("end", () => {
    const data = Buffer.concat(buffers);
    // Assuming body is UTF-8 encoded text..
    const bodyText = data.toString("utf-8");
    console.log("Request body:", bodyText);

    forwardingUrls.forEach((forwardUrl) => {
      forwardRequest(forwardUrl, req, data);
    });

    res.writeHead(200);
    res.end("Request forwarded successfully");
  });
});

function forwardRequest(url: string, originalReq: IncomingMessage, data: Buffer) {
  const urlObj = new URL(url);
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname + urlObj.search,
    method: originalReq.method,
    headers: {
      ...originalReq.headers,
      "Content-Length": Buffer.byteLength(data),
    },
    timeout: timeoutMs,
  };

  const protocol = urlObj.protocol === "https:" ? https : http;

  const req = protocol.request(options, (res: IncomingMessage) => {
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      console.log(`${chunk}`);
    });
    res.on("end", () => {
      console.log("No more data in response.");
    });
  });

  req.on("error", (e: Error) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

server.listen(listenPort, listenIp, () => {
  console.log(`Server running at http://${listenIp}:${listenPort}/`);
});
