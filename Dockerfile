FROM php:8.2-apache

ENV CMS_DATA_DIR=/var/www/data

RUN a2enmod rewrite headers alias

COPY docker/php.ini /usr/local/etc/php/conf.d/cms.ini
COPY docker/apache-cms.conf /etc/apache2/conf-available/cms.conf
RUN a2enconf cms

COPY docker/entrypoint.sh /usr/local/bin/cms-entrypoint
RUN chmod +x /usr/local/bin/cms-entrypoint

COPY . /var/www/html/
RUN rm -rf /var/www/html/cms/sessions /var/www/html/cms/backups /var/www/html/docker \
    && chown -R www-data:www-data /var/www/html \
    && chmod 755 /var/www/html

EXPOSE 80

ENTRYPOINT ["cms-entrypoint"]
CMD ["apache2-foreground"]
