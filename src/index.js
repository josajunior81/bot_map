"use strict";

import express from "express";
import wit from "node-wit";
import { Telegraf } from "telegraf";
import localtunnel from "localtunnel";
import LatLon from "geodesy/latlon-spherical.js";

const app = express();
const port = 3000;

const botToken = (() => {
  if (process.env.BOT_TOKEN === undefined) {
    console.log("Error dont have BOT_TOKEN");
    process.exit(1);
  }
  return process.env.BOT_TOKEN;
})();
const bot = new Telegraf(botToken);

const accessToken = (() => {
  if (process.env.WIT_KEY === undefined) {
    console.log("usage: node examples/basic.js <wit-access-token>");
    process.exit(1);
  }
  return process.env.WIT_KEY;
})();
const client = new wit.Wit({ accessToken });

app.disable("x-powered-by");

app.use(bot.webhookCallback(`/callback`));

app.listen(port, () => {
  console.log(`⚡️ Example app listening at http://localhost:${port}`);
});

if (process.env.NODE_ENV === "development") {
  (async () => {
    const tunnel = await localtunnel({ port: +port });
    console.log(`⚡️[TUNNEL URL]: ${tunnel.url}`);
    await bot.telegram.setWebhook(`${tunnel.url}/callback`);
  })();
}

app.get("/", (req, res) => {
  const d = distanceInKmBetweenEarthCoordinates(
    -12.842450141907,
    -38.327259063721,
    -23.547500610352,
    -46.636108398438
  );
  res.send(`Distância ${d} Km`);
});

app.get("/wit/:msg", async (req, res) => {
  const distance = await getDistance(req.params.msg);
  res.send(`Distância ${distance.toFixed(2)} Km`);
});

bot.command("distance", async (ctx) => {
  const text = ctx.message.text.replace("/distance", "");
  const distance = await getDistance(text);
  if (isNaN(distance)) ctx.reply(distance);
  else ctx.reply(`Distância ${distance.toFixed(2)} Km`);
});

async function getDistance(text) {
  try {
    const data = await client.message(text);
    const coords = data.entities.location.map((locs) =>
      locs.resolved.values
        .filter((val) => val.grain === "locality")
        .map((local) => local.coords)
    );
    const p1 = new LatLon(coords[0][0].lat, coords[0][0].long);
    const p2 = new LatLon(coords[1][0].lat, coords[1][0].long);
    return p1.distanceTo(p2) / 1000;
  } catch (e) {
    return e;
  }
}
