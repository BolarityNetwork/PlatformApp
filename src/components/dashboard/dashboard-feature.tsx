import React from 'react'
import { CommingSoon } from './dashboard-ui'

const DashboardFeature = () => {
  return (
    <main className="container">
      <div className="padding-y flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <CommingSoon />
      </div>
    </main>
  )
}

export default DashboardFeature