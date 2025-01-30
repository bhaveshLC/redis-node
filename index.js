const express = require("express");
const Redis = require("ioredis");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
const client = new Redis({
  host: "localhost", // Default Redis host
  port: 6379, // Default Redis port
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
});
mongoose
  .connect("mongodb://localhost:27017/redis-node")
  .then(() => console.log("Database connected successfully."))
  .catch((err) => console.error(err));
const User = mongoose.model("User", userSchema);
app.post("/users", async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "ID, name, and email are required" });
  }
  try {
    const user = await User.findOne({ email: email });
    if (user) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }
    const newUser = await User.create({ email: email, name: name });
    // await client.hset(`user:${newUser._id}`, "name", name, "email", email);
    const userString = JSON.stringify(newUser);
    await client.rpush("users", userString);

    res.status(201).json(newUser);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error creating user" });
  }
});
app.get("/", async (req, res) => {
  const cachedUsers = await client.lrange("users", 0, -1);
  if (Object.keys(cachedUsers).length > 0) {
    const user = cachedUsers.map((user) => JSON.parse(user));
    return res.status(200).json(user);
  }
  const allUsers = await User.find({});
  await client.del("users");
  const userStrings = allUsers.map((user) => JSON.stringify(user));
  await client.rpush("users", ...userStrings);
  await client.expire("users", 3600);
  return res.status(200).json(allUsers);
});
app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await client.hgetall(`user:${id}`);
    if (Object.keys(user).length > 0) {
      return res
        .status(200)
        .json({ id, ...user, message: "coming from redis." });
    }
    const userFromDb = await User.findById(id);
    if (!userFromDb) {
      return res.status(404).json({ error: "User not found" });
    }
    await client.hset(
      `user:${userFromDb._id}`,
      "name",
      userFromDb.name,
      "email",
      userFromDb.email
    );
    await client.expire(`user:${userFromDb._id}`, 3600);
    res.json(userFromDb);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error retrieving user" });
  }
});
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const user = await client.hgetall(`user:${id}`);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const result = await client.hset(
      `user:${id}`,
      "name",
      name,
      "email",
      email
    );

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error updating user" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // const result = await client.del(`user:${id}`);
    await client.lrem("users", 0, JSON.stringify(user));

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting user" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
