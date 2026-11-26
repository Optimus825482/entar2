FROM nginx:stable-alpine

COPY *.html /usr/share/nginx/html/
COPY merit-bilet.html /usr/share/nginx/html/index.html
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80
