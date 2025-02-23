# Professional Movement Analysis

A real-time movement analysis tool that:
- Tracks body pose and movement
- Calculates joint angles and posture metrics
- Provides real-time feedback and analysis

## Technologies
- HTML5 Canvas for visualization
- CSS3 for styling
- JavaScript for real-time processing
- MediaPipe Pose for pose detection and tracking

## Features
- Real-time pose detection
- Joint angle calculations
- Posture analysis
- Face orientation tracking
- Performance metrics

## Setup
1. Clone the repository
2. Open index.html in a modern web browser
3. Grant camera permissions when prompted

## Requirements
- Modern web browser with WebGL support
- Camera access
- Internet connection (for loading MediaPipe libraries)

## Demo

Access the live demo at: https://vidithphillips.github.io/movement/

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