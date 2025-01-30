const client = require("./client");
async function init() {
  try {
    const res1 = await client.hset(
      "bike:2",
      "model",
      "Deimos",
      "brand",
      "Ergonom",
      "type",
      "Enduro bikes",
      "price",
      4972
    );
    console.log(res1);
  } catch (err) {
    console.error(err);
  } finally {
    client.quit();
  }
}

init();
