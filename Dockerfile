# Stage 1: Build the React frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.11-slim
WORKDIR /code

# Copy requirements and install
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy backend code
COPY backend /code/backend

# Copy the built React app from Stage 1 to a frontend_dist directory inside the backend
COPY --from=frontend-builder /app/dist /code/frontend_dist

# Expose the port for Back4App and Hugging Face
EXPOSE 7860

# Hugging Face Spaces requires the app to run on port 7860
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]

