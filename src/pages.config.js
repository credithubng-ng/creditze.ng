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
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const AdminABTests = lazy(() => import('./pages/AdminABTests'));
const AdminAffiliates = lazy(() => import('./pages/AdminAffiliates'));
const AdminCollectionConfig = lazy(() => import('./pages/AdminCollectionConfig'));
const AdminCollections = lazy(() => import('./pages/AdminCollections'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminDisbursements = lazy(() => import('./pages/AdminDisbursements'));
const AdminDisputeDetail = lazy(() => import('./pages/AdminDisputeDetail'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'));
const AdminEmployers = lazy(() => import('./pages/AdminEmployers'));
const AdminLoanCollection = lazy(() => import('./pages/AdminLoanCollection'));
const AdminLoanReview = lazy(() => import('./pages/AdminLoanReview'));
const AdminLoans = lazy(() => import('./pages/AdminLoans'));
const AdminMLScoring = lazy(() => import('./pages/AdminMLScoring'));
const AdminReferrals = lazy(() => import('./pages/AdminReferrals'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const ApplyLoan = lazy(() => import('./pages/ApplyLoan'));
const CreditHistory = lazy(() => import('./pages/CreditHistory'));
const CreditSearch = lazy(() => import('./pages/CreditSearch'));
const CreditSearchHistory = lazy(() => import('./pages/CreditSearchHistory'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DisputeDetail = lazy(() => import('./pages/DisputeDetail'));
const Home = lazy(() => import('./pages/Home'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const KYC = lazy(() => import('./pages/KYC'));
const LoanDetails = lazy(() => import('./pages/LoanDetails'));
const LoanHistory = lazy(() => import('./pages/LoanHistory'));
const MyDisputes = lazy(() => import('./pages/MyDisputes'));
const MyDocuments = lazy(() => import('./pages/MyDocuments'));
const PremiumReportPayment = lazy(() => import('./pages/PremiumReportPayment'));
const Profile = lazy(() => import('./pages/Profile'));
const RaiseDispute = lazy(() => import('./pages/RaiseDispute'));
const SetupDirectDebit = lazy(() => import('./pages/SetupDirectDebit'));
const Tier1Verification = lazy(() => import('./pages/Tier1Verification'));
const VerifyEmployment = lazy(() => import('./pages/VerifyEmployment'));


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
    "CreditHistory": CreditHistory,
    "CreditSearch": CreditSearch,
    "CreditSearchHistory": CreditSearchHistory,
    "Dashboard": Dashboard,
    "DisputeDetail": DisputeDetail,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "KYC": KYC,
    "LoanDetails": LoanDetails,
    "LoanHistory": LoanHistory,
    "MyDisputes": MyDisputes,
    "MyDocuments": MyDocuments,
    "PremiumReportPayment": PremiumReportPayment,
    "Profile": Profile,
    "RaiseDispute": RaiseDispute,
    "SetupDirectDebit": SetupDirectDebit,
    "Tier1Verification": Tier1Verification,
    "VerifyEmployment": VerifyEmployment,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
