const client = require("./client");
async function init() {
  //   await client.set("msg:3", "Hello, Redis!");
  //   await client.expire("msg:3", 10);
  //   console.log("Message set successfully");
  const result = await client.get("msg:3");
  console.log("result : ", result);
}

init();
