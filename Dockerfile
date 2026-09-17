FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
 curl \
 ca-certificates \
 python3 \
 python3-pip \
 tar \
 && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# Install high-performance s5cmd binary

RUN curl -fsSL https://github.com/peak/s5cmd/releases/download/v2.2.2/s5cmd_2.2.2_Linux-64bit.tar.gz | tar -xz -C /usr/local/bin s5cmd \
 && chmod +x /usr/local/bin/s5cmd

WORKDIR /app

# Install PyTorch with CUDA 12.1 runtime

RUN pip3 install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu121

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN mkdir -p /tmp/models /tmp/outputs

CMD ["npm", "run", "benchmark"]
