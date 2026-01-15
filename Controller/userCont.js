import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export function createUser(req, res) {
    if (req.body.role == "admin") {
        if (req.user != null) {
            if (req.user.role != "admin") {
                res.status(403).json({
                    message: "You cant create admin account"
                });
                return;
            }
        } else {
            res.status(403).json({
                message: "first login your account"
            });
            return;
        }
    }

    console.log(req.body);

    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

    const user = new Users({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hashedPassword,
        role: req.body.role,
    });

    user.save()
        .then(() => {
            res.json({
                message: "User added successfully"
            });
        })
        .catch((err) => {
            res.status(400).json({
                message: "Failed add User",
                error: err.message
            });
        });
}



export function loginUser(req,res){
    const email=req.body.email
    const password =req.body.password

    Users.findOne({email : email}).then(
        (user)=>{
           if(user == null){
            res.status(404).json({
                massage : "User not found"
            })
           }

           else{
            const isPasswordCorrect = bcrypt.compareSync(password,user.password)
                if(isPasswordCorrect){

                    const token=jwt.sign({
                        email : user.email,
                        firstName : user.firstName,
                        lastName : user.lastName,
                        role : user.role,
                         img : user.img

                    },
                    "Ushan1234!!"
                )
                    res.json({
                        mesage : " login successfuly",
                        user : user,
                        token : token
                    })
                }
                else{
                    res.status(401).json({
                       message : " invalid password"
                    })
                }
            }
           }
        )
    }

    export function isAdmin(req){
        if(req.user==null){
            return false
        }

        if(req.user.role !="admin"){
            return false
        }
        return true
    }