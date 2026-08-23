FROM python:3.11-slim

# Set the working directory
WORKDIR /code

# Copy the requirements file
COPY backend/requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the backend code
COPY backend /code/backend

# Hugging Face Spaces requires the app to run on port 7860
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
