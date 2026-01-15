import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import productRouter from './routes/productrouter.js';
import userRouter from './routes/userrouter.js';
import jwt from "jsonwebtoken";


let app=express();
//function successFully(){
    //console.log('server is running on port 3000');
//}
//mongodb+srv://admin:1234@cluster0.pb2gj4n.mongodb.net/?appName=Cluster0
app.use(bodyParser.json())

app.use((req,res,next)=>{
    const tokenString=req.header("Authorization")
    if(tokenString!=null){
        const token = tokenString.replace("Bearer ","")
        console.log(token)
        
        jwt.verify(token,"Ushan1234!!",(err,decoded)=>{ 
            if(decoded != null){ 
                req.user = decoded
                next() 
            } 
                else{ 
                    console.log("invalid token") 
                    res.status(403).json({
                        message : "invalid token"
                    })
                } 
            })
    }
    else{
        next()
    }
    
    //next()
})
mongoose.connect("mongodb+srv://admin:1234@cluster0.pb2gj4n.mongodb.net/?appName=Cluster0")
.then(()=>{
    console.log("conenct to the database")
}).catch(()=>{
    console.log("Database conaction fail")
})

app.use("/product",productRouter)
app.use("/users",userRouter)


app.listen(5000,()=>{
    console.log('server is running on port 5000');
});