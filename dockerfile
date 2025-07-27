FROM python:3.11-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-venv \
    curl \
    vim\
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy your app code including the `engine` folder (empty or existing)
COPY . .

# Download and extract Stockfish
RUN curl -LO https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar && \
    tar -xvf stockfish-ubuntu-x86-64-avx2.tar && \
    mkdir -p engines/stockfish && \
    mv stockfish ./engines && \
    rm stockfish-ubuntu-x86-64-avx2.tar

# Install Python dependencies
RUN pip install uv && uv sync --locked --python /usr/local/bin/python3

EXPOSE 8000

CMD ["uv", "run", "server.py"]
