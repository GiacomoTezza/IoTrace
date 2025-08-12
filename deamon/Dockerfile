FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
	bash openssl gcc libssl-dev \
	&& rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally
COPY requirements.txt .
RUN pip install --upgrade pip && \
	pip install --no-cache-dir -r requirements.txt

# Copy the app code and scripts
COPY . .

# Make scripts executable and run
RUN chmod +x ./run.sh
# ENTRYPOINT ["./run.sh", "periodic-mode"]

