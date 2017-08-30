#!/bin/bash


# Configure and start Spamassassin

echo "Configuring spamassassin"

perl -pi -e 's/ENABLED=0/ENABLED=1/g' /etc/default/spamassassin

rm /etc/mail/spamassassin/local.cf

cat << EOF >> /etc/mail/spamassassin/local.cf
rewrite_subject 1
required_hits 5
EOF

echo "Restarting rsyslog"
service rsyslog restart

echo "Starting spamassassin"
/etc/init.d/spamassassin start


echo "Starting Mailin with --webhook ${MAIL_WEBHOOK}"
mailin --webhook ${MAIL_WEBHOOK}