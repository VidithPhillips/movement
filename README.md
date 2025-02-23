# Movement Analysis System

A web-based real-time movement analysis system that uses computer vision to track and analyze human movement through a standard webcam. The system leverages TensorFlow.js and MoveNet for pose estimation, providing immediate visual feedback and movement metrics directly in the browser.

## Features

- Real-time pose detection using MoveNet
- Live skeleton overlay on video feed
- Joint angle tracking and visualization
- Movement speed analysis
- Browser-based processing (no server required)
- Responsive design for different screen sizes

## Demo

Access the live demo at: https://vidithphillips.github.io/movement/

## Technologies Used

- TensorFlow.js
- MoveNet (Single-pose Lightning model)
- Chart.js
- HTML5 Canvas
- Modern JavaScript (ES6+)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- Internet connection (for loading dependencies)

### Local Development

1. Clone the repository:
   git clone https://github.com/VidithPhillips/movement.git

2. Navigate to the project directory:
   cd movement

3. Serve the files using a local web server. For example, using Python:
   python -m http.server 8000

4. Open your browser and visit http://localhost:8000

## Project Structure

movement/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── js/
│   ├── main.js        # Application entry point
│   ├── poseDetection.js    # Pose detection logic
│   ├── visualization.js    # Skeleton visualization
│   └── analysis.js    # Movement analysis and metrics
└── README.md

## Usage

1. Allow camera access when prompted
2. Stand back so your full body is visible in the camera
3. Movement metrics will be displayed in real-time on the right side
4. Joint angles and movement speed are automatically calculated and graphed

## Contributing

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments

- TensorFlow.js team for the excellent pose detection models
- Chart.js for the visualization library 