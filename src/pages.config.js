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
import AdminABTests from './pages/AdminABTests';
import AdminAffiliates from './pages/AdminAffiliates';
import AdminCollectionConfig from './pages/AdminCollectionConfig';
import AdminCollections from './pages/AdminCollections';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisbursements from './pages/AdminDisbursements';
import AdminDisputeDetail from './pages/AdminDisputeDetail';
import AdminDisputes from './pages/AdminDisputes';
import AdminEmployers from './pages/AdminEmployers';
import AdminLoanCollection from './pages/AdminLoanCollection';
import AdminLoanReview from './pages/AdminLoanReview';
import AdminLoans from './pages/AdminLoans';
import AdminMLScoring from './pages/AdminMLScoring';
import AdminReferrals from './pages/AdminReferrals';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import ApplyLoan from './pages/ApplyLoan';
import CreditCheckGateway from './pages/CreditCheckGateway';
import CreditHistory from './pages/CreditHistory';
import Dashboard from './pages/Dashboard';
import DisputeDetail from './pages/DisputeDetail';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import KYC from './pages/KYC';
import LoanDetails from './pages/LoanDetails';
import LoanHistory from './pages/LoanHistory';
import MyDisputes from './pages/MyDisputes';
import MyDocuments from './pages/MyDocuments';
import Profile from './pages/Profile';
import RaiseDispute from './pages/RaiseDispute';
import SetupDirectDebit from './pages/SetupDirectDebit';
import Tier1Verification from './pages/Tier1Verification';
import VerifyEmployment from './pages/VerifyEmployment';
import CreditSearch from './pages/CreditSearch';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminABTests": AdminABTests,
    "AdminAffiliates": AdminAffiliates,
    "AdminCollectionConfig": AdminCollectionConfig,
    "AdminCollections": AdminCollections,
    "AdminDashboard": AdminDashboard,
    "AdminDisbursements": AdminDisbursements,
    "AdminDisputeDetail": AdminDisputeDetail,
    "AdminDisputes": AdminDisputes,
    "AdminEmployers": AdminEmployers,
    "AdminLoanCollection": AdminLoanCollection,
    "AdminLoanReview": AdminLoanReview,
    "AdminLoans": AdminLoans,
    "AdminMLScoring": AdminMLScoring,
    "AdminReferrals": AdminReferrals,
    "AdminSettings": AdminSettings,
    "AdminUsers": AdminUsers,
    "ApplyLoan": ApplyLoan,
    "CreditCheckGateway": CreditCheckGateway,
    "CreditHistory": CreditHistory,
    "Dashboard": Dashboard,
    "DisputeDetail": DisputeDetail,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "KYC": KYC,
    "LoanDetails": LoanDetails,
    "LoanHistory": LoanHistory,
    "MyDisputes": MyDisputes,
    "MyDocuments": MyDocuments,
    "Profile": Profile,
    "RaiseDispute": RaiseDispute,
    "SetupDirectDebit": SetupDirectDebit,
    "Tier1Verification": Tier1Verification,
    "VerifyEmployment": VerifyEmployment,
    "CreditSearch": CreditSearch,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};