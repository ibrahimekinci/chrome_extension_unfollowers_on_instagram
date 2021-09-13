console.log("main js start");

var app = {
    locationIsValid: false,
    activeTab: 'divList1',
    username: {
        val: '',
        fillStatus: false
    },

    followers: {
        val: '',
        fillStatus: false
    },

    followings: {
        val: '',
        fillStatus: false
    },
    //who don't follow you
    list1_ignored_rows: [],
    //You don't follow
    list2_ignored_rows: []
};



async function setUserName(username) {

    if (!username)
        username = '';

    localStorage.setItem('instagram_username', username);

    await chrome.storage.sync.set({
        'instagram_username': username,
        function () {
            close();
        }

    });

    setFollowers();
    setFollowings();
}

async function setFollowers(followers) {

    if (!followers)
        followers = [];

    console.log('setFollowers', followers);
    followers = followers ? JSON.stringify(followers) : [];
    localStorage.setItem('instagram_followers', followers);
}

async function setFollowings(followings) {

    if (!followings)
        followings = [];

    console.log('setFollowings', followings);
    followings = followings ? JSON.stringify(followings) : [];
    localStorage.setItem('instagram_followings', followings);
}
async function setList1IgnoredRows(rows) {

    if (!rows)
        rows = [];
    console.log('setList1IgnoredRows', rows);
    rows = rows ? JSON.stringify(rows) : [];
    localStorage.setItem('instagram_list1_ignored_rows', rows);
}

async function setList2IgnoredRows(rows) {

    if (!rows)
        rows = [];

    console.log('setList2IgnoredRows', rows);
    rows = rows ? JSON.stringify(rows) : [];
    localStorage.setItem('instagram_list2_ignored_rows', rows);
}
async function fillList1IgnoredRows() {

    var data = JSON.parse(localStorage.getItem('instagram_list1_ignored_rows'));

    console.log('instagram_list1_ignored_rows', data);

    app.list1_ignored_rows = data && data.length > 0 ? data : [];
}

async function fillList2IgnoredRows() {

    var data = JSON.parse(localStorage.getItem('instagram_list2_ignored_rows'));

    console.log('instagram_list2_ignored_rows', data);

    app.list2_ignored_rows = data && data.length > 0 ? data : [];

}

async function fillUserName() {

    var localData = localStorage.getItem('instagram_username');
    app.username.val = localData && localData.length > 0 ? localData : '';
    app.username.fillStatus = true;

    await chrome.storage.sync.get('instagram_username', function (data) {
        console.log('instagram_username', data);
        data.instagram_username = data.instagram_username && data.instagram_username.length > 0 ? data.instagram_username : '';
        app.username.val = data.instagram_username;
        localStorage.setItem('instagram_username', app.username.val);
    });
}

async function fillFollowers() {

    var data = JSON.parse(localStorage.getItem('instagram_followers'));

    console.log('instagram_followers', data);

    app.followers.fillStatus = true;

    app.followers.val = data && data.length > 0 ? data : [];

}

async function fillFollowings() {
    var data = JSON.parse(localStorage.getItem('instagram_followings'));

    console.log('instagram_followings', data);

    app.followings.fillStatus = true;
    app.followings.val = data && data.length > 0 ? data : [];

}

async function main_init() {
    fillUserName();
    fillFollowers();
    fillFollowings();
    fillList1IgnoredRows();
    fillList2IgnoredRows();
}

console.log("main js end");