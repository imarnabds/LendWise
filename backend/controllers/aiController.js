const aiService = require('../services/aiService');

const handleChat = async (req, res, next) => {
    try {
        const { message } = req.body;
        const result = await aiService.processChatQuery({
            userId: req.user.id,
            role: req.user.role,
            message
        });

        res.json({
            success: true,
            reply: result.reply,
            message: result.reply,
            intent: result.intent,
            summary: result.summary
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    handleChat
};
