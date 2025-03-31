const { prisma } = require('../prisma/prisma-client')

const PostController = {
    createPost: async (req, res) => {
        const { content } = req.body;
        const authorId = req.user.userId;

        if (!content) {
            return res.status(400).json({ error: 'Все поля обязательны' })
        }

        try {
            const post = await prisma.post.create({
                data: {
                    content,
                    authorId
                }
            })

            res.json(post)
        } catch(e) {
            console.log("Create Post Error", e);
            res.status(500).json({ error: 'Internal server error' })
        }
    }, 
    getAllPosts: async (req, res) => {
        const { userId } = req.user

        try {
            const posts = await prisma.post.findMany({
                include: {
                    likes: true,
                    author: true,
                    comments: true
                }, 
                orderBy: {
                    createdAt: 'desc'
                }
            })

            const postWithLikeInfo = posts.map(post => ({
                ...post,
                likedByUser: post.likes.some(like => like.userId === userId)
            }))

            res.json(postWithLikeInfo)
        } catch(e) {
            console.log('Get all post error', e);
            res.status(500).json({ error: 'Internal server error' })
        }
    }, 
    getPostById: async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId

        try {
            const post = await prisma.post.findUnique({
                where: { id }, 
                include: {
                    comments: {
                        include: {
                            user: true
                        }
                    },
                    likes: true,
                    author: true
                } 
            })

            if(!post) {
                return res.status(404).json({ error: 'Пост не найден' })
            }

            const postWithLikeInfo = {
                ...post, 
                likedByUser: post.likes.some(like => like.userId === userId)
            }

            res.json(postWithLikeInfo)
        } catch(e) {
            console.log('Get Post by id error', e);
            res.status(500).json({ error: 'Internal server error' })
        }
    }, 
    DeletePost: async (req, res) => {
        const { id } = req.params

        const post = await prisma.post.findUnique({
            where: { id }
        })
        if(!post) {
            return res.status(404).json({ error: 'Пост не найден' })
        }

        if (post.authorId !== req.user.userId) {
            return res.status(403).json({ error: 'Нет доступа' })
        }
        
        try {
            const transaction = await prisma.$transaction([
                prisma.comment.deleteMany({ where: { postId: id}}),
                prisma.like.deleteMany({ where: { postId: id }}),
                prisma.post.delete({ where: { id }})
            ])
            res.json(transaction)
        } catch(e) {
            console.log(e)
            res.status(500).json({ error: 'Internal server error' })
        }
    }
}

module.exports = PostController;