# www.jvernay.fr

This repository contain the sources for the website located at https://www.jvernay.fr/

The webserver is **nginx**.

The nginx configuration provided here is not complete and must be included from the main nginx.conf.
For instance, if this repository is cloned at `/path/to/www.jvernay.fr`, then the main nginx.conf will contain:

```nginx
http {
  server {
    listen 443 ssl;
    server_name www.jvernay.fr;
    
    root /path/to/www.jvernay.fr/root;
    include /path/to/www.jvernay.fr/nginx.conf;
  }
}
```
