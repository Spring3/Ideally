const request = require('request');

const apiEndpoint = 'https://api.github.com';

function getUserRepos(user) {
  return new Promise((resolve, reject) => {
    request({
      method: 'get',
      uri: `${apiEndpoint}/user/repos?per_page=100`,
      headers: {
        'Authorization': `token ${user.token}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
      }
    }, (error, res, body) => {
      if (error || res.statusCode !== 200) {
        console.log(body);
        return resolve([]);
      }
      return resolve(JSON.parse(body));
    });
  });
}

module.exports = {
  getUserRepos
};
