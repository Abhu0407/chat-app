import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;
    try {

        if(!fullName || !email || !password) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword
        });

        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            })
        }
        else {
            return res.status(400).json({ message: "Failed to create new user" });
        }

    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if(!user){
            return res.status(400).json({ message: "Email or password is incorrect" });
        }

        const isPassword = await bcrypt.compare(password, user.password);

        if(!isPassword){
            return res.status(400).json({ message: "Email or password is incorrect" });
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie( "jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const updateProfile = async (req, res) => {
    try {
        const {profilePic} = req.body;
        const userId = req.user._id;

        if(!profilePic){
            return res.status(400).json({ message: "Please provide a profile picture" });
        }

        let profilePicUrl;

        // Check if profilePic is a URL (DiceBear or other external URL)
        if (profilePic.startsWith('http://') || profilePic.startsWith('https://')) {
            // It's already a URL, use it directly
            profilePicUrl = profilePic;
        } else {
            // It's a base64 image, upload to Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(profilePic);
            profilePicUrl = uploadResponse.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { profilePic: profilePicUrl }, 
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            _id: updatedUser._id,
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
            createdAt: updatedUser.createdAt,
        });
    } catch (error) {
        console.log("Error in update profile controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const checkAuth = async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in check auth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}