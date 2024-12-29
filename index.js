const express = require("express");
const mongoose = require('mongoose');
const { expenseRouter } = require("./router/expense");
const { userRouter } = require("./router/userRouter");
const cors = require("cors")
require('dotenv').config()

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors())

const URI = process.env.MONGO_URL
mongoose
  .connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(err));


app.get("/",(req,res)=>{

    res.send("Works")
})


app.use("/api",expenseRouter)
app.use("/user",userRouter)

app.listen(PORT,()=>{
    console.log("Server running on port "+PORT)
})