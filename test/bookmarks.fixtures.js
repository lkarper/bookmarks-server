const makeBookmarksArray = () => {
    return [
        {
            id: 1,
            title: "Bookmark!",
            url: "http://google.com",
            description: "Aliquip incididunt do nulla laboris et nulla qui et nulla et nostrud commodo.",
            rating: 1,
        },
        {
            id: 2,
            title: "Pups!",
            url: "http://pups.com",
            description: "Amet enim ex duis eu.",
            rating: 5,
        },
        {
            id: 3,
            title: "Moar pups!",
            url: "http://moarpyps.com",
            description: "Elit esse laboris esse ea Lorem.",
            rating: 4,
        },
        {
            id: 4,
            title: "All the pups!",
            url: "http://puuuuuuups.com",
            description: "Nisi cupidatat excepteur elit ullamco.",
            rating: 3,
        },
        {
            id: 5,
            title: "doggos!",
            url: "http://doggos.com",
            description: "Deserunt quis minim velit proident voluptate aliqua.",
            rating: 5,
        },
    ]
};

const makeMaliciousBookmark = () => {
    return {
        id: 911,
        title: "Malicious<script>dfasd</script>",
        url: 'http://google.com',
        rating: 1,
        description: `Ipsum laborum cupidatat ad ullamco non consequat minim voluptate in dolor mollit. <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`
    }
}

const makeSanatizedBookmark = () => {
    return {
        id: 911,
        title: "Malicious&lt;script&gt;dfasd&lt;/script&gt;",
        url: 'http://google.com',
        rating: 1,
        description: `Ipsum laborum cupidatat ad ullamco non consequat minim voluptate in dolor mollit. <img src="https://url.to.file.which/does-not.exist">`
    }
}

module.exports = {
    makeBookmarksArray,
    makeMaliciousBookmark,
    makeSanatizedBookmark,
}