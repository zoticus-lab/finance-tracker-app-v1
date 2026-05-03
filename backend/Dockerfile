FROM php:8.1-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    zip \
    unzip \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Laravel (basic set)
RUN docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_mysql \
    mbstring \
    tokenizer \
    xml \
    zip

# Install additional extensions separately
RUN docker-php-ext-install -j$(nproc) \
    ctype \
    dom \
    fileinfo \
    filter \
    exif \
    pcntl \
    bcmath

# Enable mod_rewrite for Apache
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy composer from official composer image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set PHP memory limit for composer
RUN echo "memory_limit = -1" > /usr/local/etc/php/conf.d/composer-memory.ini

# Copy .env first
COPY .env.example .env

# Copy composer files
COPY composer.json composer.lock* ./

# Install PHP dependencies with better error handling
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress || \
    (composer install --no-dev --no-interaction --no-progress 2>&1 | tail -20 && exit 1)

# Copy application files
COPY . .

# Create storage directories and set permissions
RUN mkdir -p storage/logs bootstrap/cache
RUN chmod -R 755 storage bootstrap/cache
RUN chown -R www-data:www-data /var/www/html

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

# Start Apache
CMD ["apache2-foreground"]
