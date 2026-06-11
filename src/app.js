// FILE: src/app.js
import express from "express";
import cors from "cors";

import userRoutes from "./routes/user/user.routes.js";
import uploadRoutes from "./routes/upload/upload.routes.js";
import postRoutes from "./routes/post/post.routes.js";
import reportPostRoutes from "./routes/report/reportPost.routes.js";
import commentRoutes from "./routes/comment/comment.routes.js";
import commentReactionRoutes from "./routes/comment/commentReaction.routes.js";
import videoRoutes from "./routes/post/video.routes.js";
import followRoutes from "./routes/follow/follow.routes.js";
import groupRoutes from "./routes/group/group.routes.js";
import groupPostRoutes from "./routes/group/groupPost.routes.js";
import storyRoutes from "./routes/stories/story.routes.js";
import monetizationRoutes from "./routes/monetization/monetization.routes.js";
import withdrawRoutes from "./routes/withdraw/withdraw.routes.js";
import pushNotificationRoutes from "./routes/push/push.routes.js";
import notificationRoutes from "./routes/notification/notification.routes.js";
import userAdsRoutes from "./routes/admin/adminAds.routes.js";
import adsClickRoutes from "./routes/ads/adClick.routes.js";
import transactionRoutes from "./routes/transaction/transaction.routes.js";



// admin
import adminPostRoutes from "./routes/admin/adminPost.routes.js";
import adminUserRoutes from "./routes/admin/adminUser.routes.js";
import adminMonetizationRoutes from "./routes/admin/adminMonetiz.routes.js";
import adminStoryRoutes from "./routes/admin/adminStory.routes.js";
import adminWithdrawRoutes from "./routes/admin/adminWithdraw.routes.js";
import adminGroupRoutes from "./routes/admin/adminGroup.routes.js";
import adminGroupPostRoutes from "./routes/admin/adminGroupPost.routes.js";
import adminAdsRoutes from "./routes/admin/adminAds.routes.js"
import AdminWalletSettings from "./routes/admin/walletSettings.routes.js"
import adminGeneralVideoRoutes from "./routes/admin/adminGeneralVideo.routes.js";
import settingRoutes from "./routes/admin/adminSetting.routes.js";



// chatting
import chatRoutes from "./routes/chat/chat.routes.js";






const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("OK Server Running"));
app.set("trust proxy", true);

app.use("/upload", uploadRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/comment", commentRoutes);
app.use("/comment", commentReactionRoutes);
app.use("/videos", videoRoutes);
app.use("/follow", followRoutes);
app.use("/groups", groupRoutes);
app.use("/groups", groupPostRoutes);
app.use("/stories", storyRoutes);
app.use("/monetization", monetizationRoutes);
app.use("/withdraw", withdrawRoutes);
app.use("/pushNotification", pushNotificationRoutes);
app.use("/notification", notificationRoutes);
app.use("/users/ads", userAdsRoutes);
app.use("/videos/ads", adsClickRoutes);
app.use("/transaction", transactionRoutes);



// user and admin
app.use("/report", reportPostRoutes);


// admin
app.use("/admin", adminUserRoutes);
app.use("/admin", adminPostRoutes);
app.use("/admin", adminGroupRoutes);
app.use("/admin/groups/post", adminGroupPostRoutes);
app.use("/admin", adminMonetizationRoutes);
app.use("/admin", adminStoryRoutes);
app.use("/admin", adminWithdrawRoutes);
app.use("/admin", adminGeneralVideoRoutes);
app.use("/admin", settingRoutes);


//admin ads route
app.use("/admin",adminAdsRoutes)
//admin wallet-settings
app.use("/admin",AdminWalletSettings)



// chatting

app.use("/chat", chatRoutes);


export default app;
