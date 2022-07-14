console.log("Unfollowers for Instagram - scripts added to page ");
var debugMode = false;

function sendUpdatedLists(result, user_id, followers, followings) {
  var message = {
    process: 'updated_lists',
    result: result,
    user_id: user_id,
    followers: followers,
    followings: followings
  };

  chrome.runtime.sendMessage(message);
}

function sendGenericMessage(process, result, user_id) {
  var message = {
    process: process,
    result: result,
    user_id: user_id
  };

  chrome.runtime.sendMessage(message);
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function async_get_followers(query_hash, userId) {

  if (debugMode) console.log('async_get_followers started')

  var followers = [];
  var hasError = false;
  var has_next = true;
  var after = null;

  try {
    while (has_next) {
      await fetch(`https://www.instagram.com/graphql/query/?query_hash=${query_hash}&variables=` + encodeURIComponent(JSON.stringify({
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
            id: node.id,
            username: node.username,
            full_name: node.full_name,
            profile_pic_url: node.profile_pic_url,
            is_private: node.is_private,
          }
        }))
      })
    }
  } catch (err) {
    hasError = true;
    console.log('error', err);
  } finally {
    if (debugMode) console.log('async_get_followers completed', 'hasError', hasError);
    return hasError ? null : followers;
  }
}

async function async_get_followings(query_hash, userId) {
  if (debugMode) console.log('async_get_followings started')

  var followings = [];
  var hasError = false;
  var has_next = true;
  var after = null;

  try {
    while (has_next) {
      await fetch(`https://www.instagram.com/graphql/query/?query_hash=${query_hash}&variables=` + encodeURIComponent(JSON.stringify({
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
            id: node.id,
            username: node.username,
            full_name: node.full_name,
            profile_pic_url: node.profile_pic_url,
            is_private: node.is_private
          }
        }))
      })
    }

  } catch (err) {
    hasError = true;
    console.log('error', err);
  } finally {
    if (debugMode) console.log('async_get_followings completed', 'hasError', hasError);
    return hasError ? null : followings;
  }
}


//thank you for this transaction 
//from stackoverflow
async function async_update_instagram_info() {
  if (debugMode) console.log('async_update_instagram_info started');
  let followers = null,
    followings = null,
    hasError = false;

  let userId = getCookie('ds_user_id');

  if (userId && userId > 0) {
    if (debugMode) console.log('1');
    followers = await async_get_followers('37479f2b8209594dde7facb0d904896a', userId);
    if (debugMode) console.log('2');
    followings = await async_get_followings('d04b0a864b4b54837c0d870b0e77e076', userId);
    if (debugMode) console.log('3');
  }

  hasError = followers == null || followings == null;
  sendUpdatedLists(!hasError, userId, followers, followings);

  if (debugMode) console.log('async_update_instagram_info ended', 'hasError', hasError, 'followers', followers, 'followings', followings);
}

async function go_profile(username) {
  if (debugMode) console.log('go_profile', username);
  if (username)
    location.href = "https://www.instagram.com/" + username + "/";
}
async function async_unfollow(user_id) {
  var csrftoken = getCookie("csrftoken");

  if (!csrftoken || csrftoken.length == 0) {
    if (debugMode) console.log('csrftoken is empty');
    return;
  }

  await fetch(`https://www.instagram.com/web/friendships/${user_id}/unfollow/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', "x-csrftoken": csrftoken },
  }).then(async response => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const error = (data && data.message) || response.status;
      console.log('response is not valid', error);
      sendGenericMessage('unfollow_result', false, user_id);
    }
    else {
      sendGenericMessage('unfollow_result', true, user_id);
    }
  }).catch(error => {
    console.error('error', error);
    sendGenericMessage('unfollow_result', false, user_id);
  });

  // $.ajax({
  //   url: `https://www.instagram.com/web/friendships/${user_id}/unfollow/`,
  //   type: 'post',
  //   headers: {
  //     "x-csrftoken": csrftoken
  //   },
  //   dataType: 'json',
  //   success: function (data) {
  //     if (debugMode) console.info(data);
  //   },
  //   error: function (xhr, ajaxOptions, thrownError) {
  //     console.info('xhr', xhr, 'ajaxOptions', ajaxOptions, 'thrownError', thrownError);
  //   }
  // });
}

async function async_follow(user_id) {
  var csrftoken = getCookie("csrftoken");

  if (!csrftoken || csrftoken.length == 0) {
    if (debugMode) console.log('csrftoken is empty');
    return;
  }

  await fetch(`https://www.instagram.com/web/friendships/${user_id}/follow/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', "x-csrftoken": csrftoken },
  }).then(async response => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const error = (data && data.message) || response.status;
      console.log('response is not valid', response, error);
      sendGenericMessage('follow_result', false, user_id);
    }
    else {
      sendGenericMessage('follow_result', true, user_id);
    }
  }).catch(error => {
    console.error('error', error);
    sendGenericMessage('follow_result', false, user_id);
  });
}

chrome.runtime.onMessage.addListener(
  async function (request, sender, sendResponse) {
    if (debugMode) console.log('chrome.runtime.onMessage.addListener', request, sender, sendResponse);
    if (request)
      if (request.process == 'update_instagram_info') {
        await async_update_instagram_info();
      } else if (request.process == 'go_profile') {
        await go_profile(request.username);
      }
      else if (request.process == 'follow') {
        await async_follow(request.user_id);
      }
      else if (request.process == 'unfollow') {
        await async_unfollow(request.user_id);
      }
  }
);