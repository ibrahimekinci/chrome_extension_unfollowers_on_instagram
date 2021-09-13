console.log("Unfollowers for Instagram - add instagram js start");

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);
    if (request)
      if (request.process == 'update_instagram_info') {
        async_update_instagram_info(request.username);
      } else if (request.process == 'go_profile') {
      go_profile(request.username);
    }
  }
);


function go_profile(username) {
  console.log('go_profile', username);
  if (username)
    location.href = "https://www.instagram.com/" + username + "/";
}

function sendUpdatedLists(result,followers,followings) {
  var message = {
    process: 'updated_lists',
    user_name: app.username.val,
    result: result,
    followers : followers,
    followings : followings
  };

  chrome.runtime.sendMessage(message);
}

//thank you for this transaction 
//from stackoverflow
async function async_update_instagram_info(username) {
  console.log('async_update_instagram_info', username);

  var hasError = false;
  let followers = [],
    followings = [];

  try {
    let res = await fetch(`https://www.instagram.com/${username}/?__a=1`)

    res = await res.json()
    let userId = res.graphql.user.id

    let after = null,
      has_next = true
    while (has_next) {
      await fetch(`https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` + encodeURIComponent(JSON.stringify({
        id: userId,
        include_reel: true,
        fetch_mutual: true,
        first: 50,
        after: after
      }))).then(res => res.json()).then(res => {
        has_next = res.data.user.edge_followed_by.page_info.has_next_page
        after = res.data.user.edge_followed_by.page_info.end_cursor
        followers = followers.concat(res.data.user.edge_followed_by.edges.map(({
          node
        }) => {
          return {
            username: node.username,
            full_name: node.full_name
          }
        }))
      })
    }
    console.log('Followers', followers)

    has_next = true
    after = null
    while (has_next) {
      await fetch(`https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` + encodeURIComponent(JSON.stringify({
        id: userId,
        include_reel: true,
        fetch_mutual: true,
        first: 50,
        after: after
      }))).then(res => res.json()).then(res => {
        has_next = res.data.user.edge_follow.page_info.has_next_page
        after = res.data.user.edge_follow.page_info.end_cursor
        followings = followings.concat(res.data.user.edge_follow.edges.map(({
          node
        }) => {
          return {
            username: node.username,
            full_name: node.full_name
          }
        }))
      })
    }

    console.log('Followings', followings)
  } catch (err) {
    hasError = true;
    console.log('Invalid username')
  } finally {
    console.log('hasError', hasError);
    
    sendUpdatedLists(!hasError,followers,followings);
  }
}

console.log("Unfollowers for Instagram - add instagram js end");