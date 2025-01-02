const express = require("express");
const mongoose = require('mongoose');
const { expenseRouter } = require("./router/expense");
const { userRouter } = require("./router/userRouter");
const cors = require("cors");
const { expenseHandler } = require("./router/expenseHandler");
require('dotenv').config()

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors())

const URI = process.env.MONGO_URL
mongoose
  .connect("mongodb://localhost:27017/expenseTrackerTesting")
  .then(() => console.log('Connected to MongoDB'))


app.get("/",(req,res)=>{

    res.send("Works")
})


app.use("/api",expenseRouter)
app.use("/user",userRouter)
app.use("/expenses",expenseHandler)

app.listen(PORT,()=>{
    console.log("Server running on port "+PORT)
})