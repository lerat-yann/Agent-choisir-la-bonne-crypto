import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Filler
)

function toSeries(prices = []) {
  return prices.map(([timestamp, value]) => ({
    x: new Date(timestamp),
    y: value
  }))
}

export default function PriceChart({ prices, label }) {
  const data = {
    datasets: [
      {
        label,
        data: toSeries(prices),
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45, 106, 79, 0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 0
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'month' },
        grid: { display: false }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          callback: (value) => `$${value}`
        }
      }
    }
  }

  return <Line data={data} options={options} />
}
