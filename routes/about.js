const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import the JWT-based auth middleware

// Sample data - In a real application, this would come from a database
const aboutData = {
    aboutContent: {
        description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Ab quibusdam officia magni ea dolorum repellat assumenda dignissimos ipsum magnam unde!"
    },
    stats: {
        courses: 10000,
        students: 20000,
        teachers: 2000,
        placement: 100
    },
    reviews: [
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "John Doe",
            userImage: "/images/pic-2.jpg",
            rating: 4.5
        },
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "Jane Smith",
            userImage: "/images/pic-3.jpg",
            rating: 5
        },
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "Mike Johnson",
            userImage: "/images/pic-4.jpg",
            rating: 4
        },
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidente, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "Sarah Williams",
            userImage: "/images/pic-5.jpg",
            rating: 4.5
        },
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidente, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "David Brown",
            userImage: "/images/pic-6.jpg",
            rating: 5
        },
        {
            comment: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidente, hic velit unde a adipisci id dolor officiis dignissimos aut tempore.",
            userName: "Emily Davis",
            userImage: "/images/pic-7.jpg",
            rating: 4
        }
    ]
};

// About page route
router.get('/', auth, (req, res) => {
    res.render('about', {
        user: req.user, // Provided by auth.js
        ...aboutData,
        path: req.path // Ensure path is passed for active nav links
    });
});

module.exports = router;