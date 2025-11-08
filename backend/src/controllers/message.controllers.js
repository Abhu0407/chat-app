import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsersForSidebar =async (req,res) => {
    try {
        const loggedInUserId = req.user._id;
        // Filter out the logged-in user and any user with "john" in their name or email (case-insensitive)
        const filteredUsers = await User.find({
            _id: { $ne: loggedInUserId },
            $nor: [
                { fullName: { $regex: /john/i } },
                { email: { $regex: /john/i } }
            ]
        }).select("-password");

        // Create dummy accounts
        const dummyAccounts = [
            {
                _id: "dummy_user_1",
                fullName: "Alice Johnson",
                username: "alice_j",
                profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
                email: "alice@example.com",
                isDummy: true
            },
            {
                _id: "dummy_user_2",
                fullName: "Bob Smith",
                username: "bob_smith",
                profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
                email: "bob@example.com",
                isDummy: true
            },
            {
                _id: "dummy_user_3",
                fullName: "Charlie Brown",
                username: "charlie_b",
                profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
                email: "charlie@example.com",
                isDummy: true
            },
            {
                _id: "dummy_user_4",
                fullName: "Diana Prince",
                username: "diana_p",
                profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
                email: "diana@example.com",
                isDummy: true
            },
            {
                _id: "dummy_user_5",
                fullName: "Emma Watson",
                username: "emma_w",
                profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
                email: "emma@example.com",
                isDummy: true
            }
        ];

        // Combine real users and dummy accounts (dummy accounts at the end)
        const allUsers = [...filteredUsers, ...dummyAccounts];

        res.status(200).json(allUsers);
    } catch (error) {
        console.log("Error fetching users for sidebar", error.message);
        res.status(500).json({ error: "Error fetching users for sidebar" });
    }
};

export const getMessages = async (req, res) => {
try {
    const { id:userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
        $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId }
        ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
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

        // Emit socket event to receiver
        const io = req.app.get('io');
        const onlineUsersMap = req.app.get('onlineUsers');
        
        if (io && onlineUsersMap) {
            // Convert to string for Map lookup (MongoDB ObjectId)
            const receiverIdStr = receiverId.toString();
            
            // Send to receiver if online
            const receiverSocketId = onlineUsersMap.get(receiverIdStr);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('newMessage', newMessage);
            }
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sending message", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};