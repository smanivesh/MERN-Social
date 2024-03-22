const User = require("../models/User");
const Post= require("../models/Post");
const {sendEmail} = require("../middlewares/sendEmail");

exports.register = async (req, res)=>{
    try{
        const {name, email, password} = req.body;

        let user = await User.findOne({email});
        if(user) return res.status(400).json({success: false, message: "User already exists"});

        user= await User.create({name, email, password, avatar: {public_id:"sample_id", url:"sampleurl"},});

        const token = await user.generateToken();

        const options={expires:new Date(Date.now()+ 90*24*60*60*1000), 
            httpOnly: true,
        }

        res.status(201).cookie("token", token, options).json({
            success: true,
            user,
            token,
        });
 

    } catch(error){
        res.status(500).json({
            success: "false",
            message: error.message,
        });
    }
};

exports.login = async (req, res)=>{
    try{
        const {email, password}= req.body;

        const user= await User.findOne({email}).select("+password");

        if(!user){
            return res.status(400).json({
                success: false,
                message: "User does not exist"

            });
        }

        const isMatch = await user.matchPassword(password);

        if(!isMatch){
            return res.status(400).json({
                success:false,
                message:"Incorrect password",
            });
        }

        const token = await user.generateToken();

        const options={expires:new Date(Date.now()+ 90*24*60*60*1000), 
            httpOnly: true,
        }

        res.status(200).cookie("token", token, options).json({
            success: true,
            user,
            token,
        });
 
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message,
        });
        
    }
};


//logout
exports.logout= async(req, res)=>{
    try {
        res
            .status(200)
            .cookie("token", null, { expires: new Date(Date.now()), httpOnly: true})
            .json({
                success: true,
                message:"Logged out",
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


//follow user
exports.followUser= async(req, res)=>{
    try {
        const userToFollow= await User.findById(req.params.id);
        const loggedInUser= await User.findById(req.user._id);

        if(!userToFollow){
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if(loggedInUser.following.includes(userToFollow._id)){
            const indexfollowing = loggedInUser.following.indexOf(userToFollow._id);
            loggedInUser.following.splice(indexfollowing, 1);

            const indexfollowers= userToFollow.followers.indexOf(loggedInUser._id);
            userToFollow.followers.splice(indexfollowers,1);

            await loggedInUser.save();
            await userToFollow.save();

            res.status(200).json({
                success: true,
                message: "User Unfollowed",
            });
        }
        else{
            loggedInUser.following.push(userToFollow._id);
            userToFollow.followers.push(loggedInUser._id);

            await loggedInUser.save();
            await userToFollow.save();

            res.status(200).json({
                success: true,
                message: "User followed",
            });
        }        
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


//update password
exports.updatePassword = async(req, res)=>{
    try {
        const user= await User.findById(req.user._id).select("+password");

        const {oldPassword, newPassword }= req.body;

        if(!oldPassword || !newPassword){
            return res.status(400).json({
                success: false,
                message: "Please provide old and new password",
            });
        }

        const isMatch= await user.matchPassword(oldPassword);

        if(!isMatch){
            res.status(400).json({
                success: false,
                message: "Incorrect old password",
            });
        }

        user.password= newPassword
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated"
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


//update Profile
exports.updateProfile = async (req, res)=>{
    try {
        const user= await User.findById(req.user._id);
        const {name, email}= req.body;

        if(name){
            user.name= name;
        }
        if(email){
            user.email= email;
        }

        //User Avatar: TODO

        await user.save();

        res.status(200).json({
            success:true,
            message: "Profile Updated",
        });

        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


//delete Profile
exports.deleteMyProfile = async (req, res)=>{
    try {
        const user= await User.findById(req.user._id);
        const posts= user.posts;
        const followers= user.followers;
        const following= user.following;
        const userId= user._id;


        await user.deleteOne();

        //logout user after deleting profile
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true,
        });

        //deleting all post of users
        for(let i=0; i<posts.length; i++){
            const post= await Post.findById(posts[i]);
            await post.deleteOne();
        }

        //Removing User from follower's following
        for(let i=0; i<followers.length; i++)
        {
            const follower= await User.findById(followers[i]);
            
            const index= follower.following.indexOf(userId);
            follower.following.splice(index, 1);

            await followers.save();
        }

        //Removing User from following's followers
        for(let i=0; i<following.length; i++)
        {
            const follows= await User.findById(following[i]);
            
            const index= follower.followers.indexOf(userId);
            follows.followers.splice(index, 1);

            await follows.save();
        }



        res.status(200).json({
            success: true,
            message: "Profile Deleted",
        })


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


//my profile
exports.myProfile= async (req, res)=>{
    try {
        const user= await User.findById(req.user._id).populate("posts");

        res.status(200).json({
            success: true,
            user,
        });


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


exports.getUserProfile= async (req, res)=>{
    try {
        const user= await User.findById(req.params.id).populate("posts");

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        res.status(200).json({
            success:true,
            user,
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}


exports.getAllUsers= async (req, res)=>{
    try {
        const users= await User.find({});

        res.status(200).json({
            success: true,
            users,
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

//forgot password
exports.forgotPassword = async (req, res)=>{
    try {

        const user = await User.findOne({email:req.body.email})

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const resetPasswordToken= user.getResetPasswordToken();

        await user.save();

        const resetUrl= `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetPasswordToken}`;

        const message= `Reset your Password by clicking ont the link below: \n\n ${resetUrl}`;
        
        // to send mail
        try {
            await sendEmail({
                email: user.email,
                subject: "Reset Password",
                message,
            });

            res.status(200).json({
                success: true,
                message: `Email sent to ${user.email}`,
            });         
        } catch (error) {
            user.resetPasswordToken= undefined;
            user.resetPasswordExpire= undefined;

            await user.save();

            res.status(500).json({
                success:false,
                message: error.message,
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}