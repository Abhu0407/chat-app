import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsersForSidebar =async (req,res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: { $ne: loggedInUserId }}).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error fetching users for sidebar", error.message);
        res.status(500).json({ error: "Error fetching users for sidebar" });
    }
};

export const getMessages = async (req, res) => {
try {
    const { id:userToChatId } = req.params;
    const myrId = req.user._id;

    const message = await Message.find({
        $or: [
            { sender: myrId, receiver: userToChatId },
            { sender: userToChatId, receiver: myrId }
        ]
    });

    res.statuse(200).json(message);
} catch (error) {
    console.log("Error fetching messages", error.message);
    res.status(500).json({ error: "Internal Server Error" });
}
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        // todo: realtime functionality goes here => socket.io

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sending message", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};