import mongoose from "mongoose";    

const usersSchema = mongoose.Schema(
    {
        email :{
            type : String,
            required : true,
            unique : true
        },

        firstName : {
            type: String,
            required : true
        },

        lastName : {
            type: String,
            required : true
        },

        password : {
            type : String,
            required : function () {
                return !this.googleId;
            }
        },

        googleId : {
            type : String,
            unique : true,
            sparse : true
        },

        authProvider : {
            type : String,
            enum : ["local", "google"],
            default : "local"
        },

        role : {
            type : String,
            required : true,
            default : "customer"
        },

        isBlock : {
             type : Boolean,
             required : true,
             default : false
        },

        img : {
            type : String,
            required : false,
            default:"https://share.google/EQKYEoTYMiXEIxPVz"
        },
    }
)

const Users = mongoose.model("users",usersSchema)
export default Users;