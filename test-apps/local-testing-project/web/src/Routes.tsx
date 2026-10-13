import WaterfallPage from "src/pages/WaterfallPage/WaterfallPage";
import SignupPage from "src/pages/SignupPage/SignupPage";
import ResetPasswordPage from "src/pages/ResetPasswordPage/ResetPasswordPage";
import ProfilePage from "src/pages/ProfilePage/ProfilePage";
import NotFoundPage from "src/pages/NotFoundPage/NotFoundPage";
import LoginPage from "src/pages/LoginPage/LoginPage";
import ForgotPasswordPage from "src/pages/ForgotPasswordPage/ForgotPasswordPage";
import DoublePage from "src/pages/DoublePage/DoublePage";
import ContactUsPage from "src/pages/ContactUsPage/ContactUsPage";
import BlogPostPage from "src/pages/BlogPostPage/BlogPostPage";
import AggregatedBlogPostPage from "src/pages/AggregatedBlogPostPage/AggregatedBlogPostPage";
import AboutPage from "src/pages/AboutPage/AboutPage";
import PostPostsPage from "src/pages/Post/PostsPage/PostsPage";
import PostPostPage from "src/pages/Post/PostPage/PostPage";
import PostNewPostPage from "src/pages/Post/NewPostPage/NewPostPage";
import PostEditPostPage from "src/pages/Post/EditPostPage/EditPostPage";
import ContactNewContactPage from "src/pages/Contact/NewContactPage/NewContactPage";
import ContactEditContactPage from "src/pages/Contact/EditContactPage/EditContactPage";
import ContactContactsPage from "src/pages/Contact/ContactsPage/ContactsPage";
import ContactContactPage from "src/pages/Contact/ContactPage/ContactPage";
// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route, Private, Set } from "@rwgql/router";

import BlogLayout from "src/layouts/BlogLayout/BlogLayout";
import ScaffoldLayout from "src/layouts/ScaffoldLayout/ScaffoldLayout";
import HomePage from "src/pages/HomePage/HomePage";

import { useAuth } from "./auth.js";

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      <Route path="/double" page={DoublePage} name="double" prerender />
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/signup" page={SignupPage} name="signup" />
      <Route path="/forgot-password" page={ForgotPasswordPage} name="forgotPassword" />
      <Route path="/reset-password" page={ResetPasswordPage} name="resetPassword" />
      <Set
        wrap={ScaffoldLayout}
        title="Contacts"
        titleTo="contacts"
        buttonLabel="New Contact"
        buttonTo="newContact"
      >
        <Route path="/contacts/new" page={ContactNewContactPage} name="newContact" prerender />
        <Route path="/contacts/{id:Int}/edit" page={ContactEditContactPage} name="editContact" />
        <Route path="/contacts/{id:Int}" page={ContactContactPage} name="contact" />
        <Route path="/contacts" page={ContactContactsPage} name="contacts" />
      </Set>
      <Set
        wrap={ScaffoldLayout}
        title="Posts"
        titleTo="posts"
        buttonLabel="New Post"
        buttonTo="newPost"
      >
        <Route path="/posts/new" page={PostNewPostPage} name="newPost" />
        <Route path="/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />
        <Route path="/posts/{id:Int}" page={PostPostPage} name="post" />
        <Route path="/posts" page={PostPostsPage} name="posts" />
      </Set>
      <Set wrap={BlogLayout}>
        <Route
          path="/aggregated-blog-post/{id:Int}"
          page={AggregatedBlogPostPage}
          name="aggregatedBlogPost"
        />
        <Route path="/waterfall/{id:Int}" page={WaterfallPage} prerender name="waterfall" />
        <Private unauthenticated="login">
          <Route path="/profile" page={ProfilePage} name="profile" />
        </Private>
        <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" prerender />
        <Route path="/contact" page={ContactUsPage} name="contactUs" />
        <Route path="/about" page={AboutPage} name="about" prerender />
        <Route path="/" page={HomePage} name="home" prerender />
        <Route notfound page={NotFoundPage} prerender />
      </Set>
    </Router>
  );
};

export default Routes;
