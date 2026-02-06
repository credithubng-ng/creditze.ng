/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import KYC from './pages/KYC';
import CreditSearch from './pages/CreditSearch';
import ApplyLoan from './pages/ApplyLoan';
import Tier1Verification from './pages/Tier1Verification';
import VerifyEmployment from './pages/VerifyEmployment';
import LoanDetails from './pages/LoanDetails';
import LoanHistory from './pages/LoanHistory';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminEmployers from './pages/AdminEmployers';
import AdminAffiliates from './pages/AdminAffiliates';
import AdminLoans from './pages/AdminLoans';
import AdminSettings from './pages/AdminSettings';
import AdminCollections from './pages/AdminCollections';
import AdminLoanCollection from './pages/AdminLoanCollection';
import AdminCollectionConfig from './pages/AdminCollectionConfig';
import SetupDirectDebit from './pages/SetupDirectDebit';
import AdminMLScoring from './pages/AdminMLScoring';
import RaiseDispute from './pages/RaiseDispute';
import MyDisputes from './pages/MyDisputes';
import DisputeDetail from './pages/DisputeDetail';
import AdminDisputes from './pages/AdminDisputes';
import AdminDisputeDetail from './pages/AdminDisputeDetail';
import AdminReferrals from './pages/AdminReferrals';
import AdminDisbursements from './pages/AdminDisbursements';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "KYC": KYC,
    "CreditSearch": CreditSearch,
    "ApplyLoan": ApplyLoan,
    "Tier1Verification": Tier1Verification,
    "VerifyEmployment": VerifyEmployment,
    "LoanDetails": LoanDetails,
    "LoanHistory": LoanHistory,
    "Profile": Profile,
    "AdminDashboard": AdminDashboard,
    "AdminUsers": AdminUsers,
    "AdminEmployers": AdminEmployers,
    "AdminAffiliates": AdminAffiliates,
    "AdminLoans": AdminLoans,
    "AdminSettings": AdminSettings,
    "AdminCollections": AdminCollections,
    "AdminLoanCollection": AdminLoanCollection,
    "AdminCollectionConfig": AdminCollectionConfig,
    "SetupDirectDebit": SetupDirectDebit,
    "AdminMLScoring": AdminMLScoring,
    "RaiseDispute": RaiseDispute,
    "MyDisputes": MyDisputes,
    "DisputeDetail": DisputeDetail,
    "AdminDisputes": AdminDisputes,
    "AdminDisputeDetail": AdminDisputeDetail,
    "AdminReferrals": AdminReferrals,
    "AdminDisbursements": AdminDisbursements,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};