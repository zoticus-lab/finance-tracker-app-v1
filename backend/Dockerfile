FROM php:8.1-apache

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    unzip \
    ca-certificates \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PDO MySQL extension (critical for database connection)
RUN docker-php-ext-install pdo_mysql

# Upgrade composer to latest
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set PHP memory limit
RUN echo "memory_limit = -1" > /usr/local/etc/php/conf.d/composer.ini

# Enable mod_rewrite for Apache
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock* ./

# Install composer dependencies
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --ignore-platform-reqs \
    --no-scripts || true

# Copy .env
COPY .env.example .env

# Copy application files
COPY . .

# Generate APP_KEY if it's still placeholder
RUN if grep -q "APP_KEY=base64:your-app-key-here" .env; then \
        php artisan key:generate --force; \
    fi

# Run migrations on startup
RUN echo '#!/bin/bash\nphp /var/www/html/artisan migrate --force\napache2-foreground' > /start.sh && chmod +x /start.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 storage bootstrap/cache

# Configure Apache VirtualHost
RUN echo '<VirtualHost *:5001>\n\
    DocumentRoot /var/www/html/public\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    <Directory /var/www/html/public>\n\
        AllowOverride All\n\
        Require all granted\n\
        <IfModule mod_rewrite.c>\n\
            RewriteEngine On\n\
            RewriteCond %{REQUEST_FILENAME} !-f\n\
            RewriteCond %{REQUEST_FILENAME} !-d\n\
            RewriteRule ^ index.php [QSA,L]\n\
        </IfModule>\n\
    </Directory>\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

RUN echo 'Listen 5001' >> /etc/apache2/ports.conf

# Expose port
EXPOSE 5001

# Start Apache with migrations
CMD ["/start.sh"]
