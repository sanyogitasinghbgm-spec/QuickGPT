import React, { useEffect, useState } from 'react'
import { dummyPlans } from '../assets/assets'
import Loading from './Loading'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const Credits = () => {

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const { token, axios, user, setUser } = useAppContext()

  const fetchPlans = async () => {
   try {
    const { data } = await axios.get('/api/credit/plan', {
      headers: { Authorization: token }
    })
    if (data.success){
      setPlans(data.plans)
    }else{
      toast.error(data.message || 'Failed to fetch plans.')
    }
   } catch (error) {
    toast.error(error.message)
   }
   setLoading(false)
  }

  const purchasePlan = async (planId) => {
    try {
      const { data } = await axios.post('/api/credit/purchase', { planId }, { headers: { Authorization: token } })

      if (!data.success) {
        return toast.error(data.message)
      }

      const { order, key, transactionId } = data

      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: "QuickGPT",
        description: "Credit Purchase",
        order_id: order.id,
        handler: async function (response) {
          // Payment successful, now verify it on backend
          try {
            const verifyRes = await axios.post('/api/credit/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transactionId: transactionId
            }, { headers: { Authorization: token } })

            if (verifyRes.data.success) {
              toast.success("Payment successful! Credits added.")
              // Refresh user data to show updated credits
              const { data: userData } = await axios.get('/api/user/data', { headers: { Authorization: token } })
              if (userData.success) setUser(userData.user)
            } else {
              toast.error(verifyRes.data.message || "Payment verification failed")
            }
          } catch (err) {
            toast.error(err.message)
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || ""
        },
        theme: {
          color: "#7c3aed"
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    fetchPlans()
  },[])

  if(loading) return <Loading />

  return (
    <div className='max-w-7xl h-screen overflow-y-scroll mx-auto px-4 sm:px-6 lg:px-8 py-12'>
      <h2 className='text-3xl font-semibold text-center mb-10 xl:mt-30 text-gray-800 dark:text-white'>Credit Plans</h2>

      <div className='flex flex-wrap justify-center gap-8'>
        {plans.map((plan)=>(
          <div key={plan._id} className={`border border-gray-200 dark:border-purple-700 rounded-lg shadow hover:shadow-lg transition-shadow p-6 min-w-[300px] flex flex-col ${plan._id === "pro" ? "bg-purple-50 dark:bg-purple-900" : "bg-white dark:bg-transparent"}`}>
            <div className='flex-1'>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>{plan.name}</h3>
              <p className='text-2xl font-bold text-purple-600 dark:text-purple-300 mb-4'>${plan.price}
                <span className='text-base font-normal text-gray-600 dark:text-purple-200'>{' '}/ {plan.credits} credits</span>
              </p>
              <ul className='list-disc list-inside text-sm text-gray-700 dark:text-purple-200 space-y-1'>
                {plan.features.map((feature, index)=>(
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            <button onClick={()=> purchasePlan(plan._id)} className='mt-6 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium py-2 rounded transition-colors cursor-pointer'>Buy Now</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Credits