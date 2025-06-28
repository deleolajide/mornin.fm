# Mornin

source code of https://talk.4ng.net

![image](https://github.com/user-attachments/assets/9725aaaa-1b4e-4357-92e8-1e7311b4967d)


This version of Mornin audio conference web application uses Broadcast Box instead of Kraken.

## Build Setup

``` bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn dev

# build for production and launch server
$ yarn build
$ yarn start

# generate static project
$ yarn generate
```

## Deploy on Github Pages

### Custom domain name

You must have your own domain name, because the project uses relative paths.
If you use Github's domain name, it's will be deploy on `<user>.github.io/mornin.fm/`, but it will try to find js and css in `<user>.github.io/` and failed.

After you configure a CNAME record with your DNS provider, modify `src/CNAME` to your custom domain name.

By the way, Github does not recommend using the root domain name, but using the subdomain name. 
If the root domain name is used as the CNAME, see [configuring-an-apex-domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain).

### Custom Broadcastbox URI
By default, the broadcastbox service at pade.chat is used. If you want to use your a self-hosted [broadcast box](https://github.com/Glimesh/broadcast-box) as backend service, modify the code [here](https://github.com/deleolajide/mornin.fm/blob/master/src/services/rpc.ts) and ensure you expose the following REST endponts from your service:

- /api/whip
- /ap/whep
- /api/status

### Deploy
copy the /dist foler to /docs and copy index.html to 404.html

![image](https://github.com/user-attachments/assets/287c4d58-f194-440b-953d-925ec641c4ff)

Finally, go to your forked repository, click Settings -> Pages, select `master/docs` branch to save.

![image](https://github.com/user-attachments/assets/0fd5f5b0-b45a-460e-acf0-6acd03c9b141)

