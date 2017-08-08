FROM jwilder/nginx-proxy

RUN sed -i -e 's/{{ if or (eq $knownNetwork.Name $containerNetwork.Name) (eq $knownNetwork.Name "host") }}/{{ if (and (ne $containerNetwork.Name "ingress") (eq $knownNetwork.Name $containerNetwork.Name)) }}/g' /app/nginx.tmpl
