# Google Lens Image Sources API

This project provides an API for uploading an image URL and retrieving related sources using Google Lens. It leverages Puppeteer for web scraping and Puppeteer Cluster for efficient browser management, ensuring high performance and resource optimization.

## Features

- **Image Upload**: Accepts an image URL and processes it using Google Lens.
- **Related Sources Extraction**: Extracts related sources including title, source, link, thumbnails, and dimensions.
- **Concurrency Management**: Utilizes Puppeteer Cluster for handling multiple requests concurrently.
- **Rate Limiting**: Limits the number of requests per IP to prevent abuse.
- **Caching**: Caches results for faster subsequent requests.
- **Error Handling**: Centralized error handling ensures robust performance.

## Prerequisites

- Node.js (version 14.x or later)
- npm (version 6.x or later)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/shishir1337/Google-Lens-Image-Sources-API.git
    ```

2. Navigate to the project directory:

    ```bash
    cd Google-Lens-Image-Sources-API
    ```

3. Install the dependencies:

    ```bash
    npm install
    ```

## Usage

1. Start the server:

    ```bash
    npm start
    ```

2. The server will run on `http://localhost:3000`.

3. API Endpoint:

    - **POST** `/api/upload`
    - **Request Body**:
    
      ```json
      {
          "imageUrl": "https://example.com/image.jpg"
      }
      ```
    - **Response**:
    
      ```json
      {
          "image_sources": [
              {
                  "position": 1,
                  "title": "Example Title",
                  "source": "Example Source",
                  "source_logo": "https://example.com/logo.png",
                  "link": "https://example.com",
                  "thumbnail": "https://example.com/thumbnail.jpg",
                  "actual_image_width": 800,
                  "actual_image_height": 600
              },
              ...
          ]
      }
      ```

## Implementation Details

### Rate Limiting

Limits the number of requests to 10 per minute per IP to prevent abuse. This is implemented using the `express-rate-limit` package.

### Caching

Results are cached for 1 hour to improve performance and reduce redundant processing. The `node-cache` package is used for caching.

### Concurrency Management

Utilizes Puppeteer Cluster to handle multiple requests concurrently, optimizing resource usage and improving throughput. Puppeteer Cluster manages a pool of browser instances, allowing multiple pages to be processed in parallel.

### Error Handling

Centralized error handling middleware ensures that errors are properly logged and a meaningful response is sent to the client. All errors are caught and handled gracefully, providing a consistent error response format.

## Code Structure

- **`index.js`**: Main application file containing the server setup and API implementation.
- **`package.json`**: Project metadata and dependencies.

## Example Request

Here is an example of how to make a request to the API using `curl`:

```bash
curl -X POST http://localhost:3000/api/upload -H "Content-Type: application/json" -d '{"imageUrl": "https://example.com/image.jpg"}'
 ```

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with descriptive commit messages.
4. Push your changes to your fork.
5. Open a pull request to the main repository.

Please make sure to update tests as appropriate.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries, please contact [mdshishirahmed811@gmail.com](mailto:mdshishirahmed811@gmail.com).


