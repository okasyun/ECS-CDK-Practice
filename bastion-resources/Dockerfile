FROM amazonlinux:2

RUN yum install -y sudo jq awscli shadow-utils htop lsof telnet bind-utils yum-utils && \
    rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 && \
    yum install -y yum localinstall https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm && \
    yum-config-manager --disable mysql80-community && \
    yum-config-manager --enable mysql57-community && \
    yum install -y mysql-community-client && \
    adduser ssm-user && echo "ssm-user ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ssm-agent-users

COPY run.sh /run.sh
CMD ["sh", "/run.sh"]
