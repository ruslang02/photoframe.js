const user = 'root';
const host = '192.168.1.101';
const repo = 'git@github.com:ruslang02/photoframe.js.git';
const path = '/var/www/photoframe'

module.exports = {
  apps: [{
    name: 'photoframe',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
  }],

  deploy: {
    production: {
      user,
      host,
      repo,
      path,
      ref: 'origin/master',
      'pre-deploy-local': `npm run build && scp dist ${user}@${host}:${path}/source`,
			'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
    }
  }
};
