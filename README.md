# NetMap

A modern, dynamic Network Topology Mapper built with React, TypeScript, Vite, and Tailwind CSS.
Create, visualize, and export interactive network diagrams featuring diverse devices, customizable ports, and smart routing.

## Features
- **Visual Network Editor**: Drag-and-drop devices, switches, patch panels, and customize their layouts dynamically.
- **Rich Device Library**: Support for various network components including PCs, Servers, Firewalls, Routers, Switches, WiFi Access Points, VoIP phones, Printers, and more.
- **Advanced Connections**: Seamless routing and link status representation. Create and remove cabling on the fly with animated indicators.
- **Port Management**: Customize the number of RJ-45, SFP, and Fiber ports dynamically for various network components. Limitless layout options.
- **Import/Export**: Easily save mapping progress to a `.json` file and restore it at any time. Take beautiful PNG screenshots directly out of the app.
- **Grouping**: Visually manage devices by separating parts of the network within resizable groups.
- **Internationalization**: Pre-configured string system for rapid translation or modification of text directly within the configuration files.

## Built With
- **[React](https://react.js.org/)**: The engine beneath our frontend components.
- **[TypeScript](https://www.typescriptlang.org/)**: For rock-solid static typing and improved IDE experience.
- **[Vite](https://vitejs.dev/)**: Super fast Hot Module Replacement and production bundling.
- **[React Flow](https://reactflow.dev/)**: Powering the drag-and-drop node graph canvas.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Providing zero-friction, utility-first styling.
- **[Lucide React](https://lucide.dev/)**: Beautifully crafted open-source icons.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or newer recommended)

### Installation
1. Clone the repository
   ```sh
   git clone https://github.com/yourusername/net-map.git
   ```
2. Navigate into the project folder
   ```sh
   cd net-map
   ```
3. Install dependencies
   ```sh
   npm install
   ```

### Running the App
Start the Vite development server:
```sh
npm run dev
```

### Building for Production
Create an optimized production bundle:
```sh
npm run build
```

## License
Distributed under the MIT License. See `LICENSE` for more information.
